import { structure } from "../../../shared/src/ssot/structure";
import express from "express";
import { Pool } from "pg";

import {
  getEntityName,
  getDerivableFields,
  getReferencedRelations,
  tryQuery,
  columnNamesEqualsNumber,
} from "../helpers";

import { getPkFields } from "../../../shared/src/utils/utils";

import {
  sendSuccessOperationMessage,
  sendNotFoundMessage,
  sendErrorMessage,
} from "../status_messages";

import type {
  TableKey,
  ColumnDef,
  Response as QueryResponse,
} from "../../../shared/src/types/types";

import {
  validateOnlyPk,
  sendErrorsIfInvalid,
} from "../validation/validate";

export async function getHandler(
  req: express.Request,
  res: express.Response,
  pool: Pool
) {
  const tableNameParam = req.params.tableName;

  if (!isKnownTable(tableNameParam)) {
    return sendNotFoundMessage(res, tableNameParam);
  }

  const tableName = tableNameParam as TableKey;
  const entityName = getEntityName(tableName);

  if (isListRequest(req.query)) {
    return getListOfTable(pool, res, tableName, req.query);
  }

  return getRowOfTable(pool, res, tableName, req.query, entityName);
}

/** Query builder used by list/table views. */
export function buildListQuery(
  tableNameOrCTE: string,
  query: express.Request["query"],
  filterConfig: Record<string, ColumnDef>,
  defaultSort: string | string[]
) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  const allowedColumns = Object.keys(filterConfig);

  for (const [key, rawValue] of Object.entries(query)) {
    if (!key.startsWith("filter_") || rawValue == null || rawValue === "") {
      continue;
    }

    const fieldName = key.slice(7);
    const config = filterConfig[fieldName];

    if (!config) {
      continue;
    }

    const vals = Array.isArray(rawValue) ? rawValue : [rawValue];

    for (const v of vals) {
      const strVal = String(v);

      if (!strVal) {
        continue;
      }

      const negated = strVal.startsWith("!");
      const actualVal = negated ? strVal.slice(1) : strVal;

      if (config.type === "string" && !config.options) {
        conditions.push(
          `"${fieldName}"::text ${negated ? "NOT " : ""}ILIKE $${paramIndex}`
        );
        values.push(`%${actualVal}%`);
        paramIndex++;
      } else if (config.options) {
        conditions.push(
          `"${fieldName}" ${negated ? "!=" : "="} $${paramIndex}`
        );
        values.push(actualVal);
        paramIndex++;
      } else if (config.type === "number") {
        const commaIdx = actualVal.indexOf(",");

        if (commaIdx >= 0) {
          const minPart = actualVal.slice(0, commaIdx);
          const maxPart = actualVal.slice(commaIdx + 1);
          const hasMin = minPart !== "";
          const hasMax = maxPart !== "";

          if (hasMin && hasMax) {
            const nMin = parseFloat(minPart);
            const nMax = parseFloat(maxPart);

            if (isNaN(nMin) || isNaN(nMax)) {
              continue;
            }

            if (negated) {
              conditions.push(
                `("${fieldName}" < $${paramIndex} OR "${fieldName}" > $${paramIndex + 1})`
              );
            } else {
              conditions.push(
                `"${fieldName}" >= $${paramIndex} AND "${fieldName}" <= $${paramIndex + 1}`
              );
            }

            values.push(nMin, nMax);
            paramIndex += 2;
          } else if (hasMin) {
            const n = parseFloat(minPart);

            if (isNaN(n)) {
              continue;
            }

            conditions.push(
              `"${fieldName}" ${negated ? "<" : ">="} $${paramIndex}`
            );
            values.push(n);
            paramIndex++;
          } else if (hasMax) {
            const n = parseFloat(maxPart);

            if (isNaN(n)) {
              continue;
            }

            conditions.push(
              `"${fieldName}" ${negated ? ">" : "<="} $${paramIndex}`
            );
            values.push(n);
            paramIndex++;
          }
        } else {
          const n = parseFloat(actualVal);

          if (isNaN(n)) {
            continue;
          }

          conditions.push(
            `"${fieldName}" ${negated ? "<" : ">="} $${paramIndex}`
          );
          values.push(n);
          paramIndex++;
        }
      }
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const defaultSortColumns = Array.isArray(defaultSort)
    ? defaultSort
    : [defaultSort];

  const requestedSort = Array.isArray(query.sort)
    ? query.sort[0]
    : query.sort;

  const requestedDir = Array.isArray(query.dir)
    ? query.dir[0]
    : query.dir;

  const sortDir = requestedDir === "desc" ? "DESC" : "ASC";

  const sortCol =
    typeof requestedSort === "string" && allowedColumns.includes(requestedSort)
      ? requestedSort
      : undefined;

  const orderColumns = sortCol
    ? [`"${sortCol}" ${sortDir}`]
    : defaultSortColumns
        .filter((column) => allowedColumns.includes(column))
        .map((column) => `"${column}" ${sortDir}`);

  const orderClause =
    orderColumns.length > 0 ? `ORDER BY ${orderColumns.join(", ")}` : "";

  const requestedPage = Array.isArray(query.page)
    ? query.page[0]
    : query.page;

  const page = Math.max(
    1,
    Math.min(parseInt(String(requestedPage || "1"), 10) || 1, 1000)
  );

  const limit = 20;
  const offset = (page - 1) * limit;

  const fromClause = tableNameOrCTE.includes(" ")
    ? `FROM (${tableNameOrCTE}) AS base`
    : `FROM ${tableNameOrCTE}`;

  const dataQuery = `
    SELECT *
    ${fromClause}
    ${whereClause}
    ${orderClause}
    LIMIT $${paramIndex}
    OFFSET $${paramIndex + 1}
  `;

  const dataValues = [...values, limit, offset];

  const countQuery = `
    SELECT COUNT(*)
    ${fromClause}
    ${whereClause}
  `;

  return {
    dataQuery,
    dataValues,
    countQuery,
    countValues: [...values],
  };
}

/** Helpers */
function isKnownTable(tableName: string): tableName is TableKey {
  return Object.prototype.hasOwnProperty.call(structure.tables, tableName);
}

function isListRequest(query: express.Request["query"]): boolean {
  const queryKeys = Object.keys(query);

  if (queryKeys.length === 0) {
    return true;
  }

  return queryKeys.every(
    (key) =>
      key === "page" ||
      key === "sort" ||
      key === "dir" ||
      key.startsWith("filter_")
  );
}

function getJoinsStatements(
  queryTable: TableKey,
  referencedRelations: TableKey[]
): string {
  let joinsStatement = "";
  const entityName = getEntityName(queryTable);

  referencedRelations.forEach((tableName) => {
    const referencedEntityName = getEntityName(tableName);

    joinsStatement += ` JOIN ${tableName} ${referencedEntityName} ON `;

    const pkFields = getPkFields(tableName);

    const pkFieldsEqualityStatements = pkFields.map(
      (pk) => `${entityName}.${pk} = ${referencedEntityName}.${pk}`
    );

    joinsStatement += pkFieldsEqualityStatements.join(" AND ");
  });

  return joinsStatement;
}

function getSelectStatement(tableName: TableKey): string {
  const entityName = getEntityName(tableName);
  const selectFields = [`${entityName}.*`];

  const derivedFields: [string, ColumnDef][] = getDerivableFields(tableName);

  selectFields.push(
    ...derivedFields.map(([fieldName, column]) => {
      const originTable = column.derivable?.originTable as TableKey;

      const expression = column.derivable?.sqlGenerationStatement.replace(
        /entityName/g,
        getEntityName(originTable)
      );

      return `${expression} AS ${fieldName}`;
    })
  );

  return `SELECT ${selectFields.join(", ")}`;
}

function getBaseSelectQuery(tableName: TableKey): string {
  const referencedRelations = getReferencedRelations(tableName);

  if (referencedRelations.length > 0) {
    return `
      ${getSelectStatement(tableName)}
      FROM ${tableName} ${getEntityName(tableName)}
      ${getJoinsStatements(tableName, referencedRelations)}
    `;
  }

  return `SELECT * FROM ${tableName}`;
}

function getListFilterConfig(tableName: TableKey): Record<string, ColumnDef> {
  const baseColumns = Object.fromEntries(
    Object.entries(structure.tables[tableName].columns as Record<string, ColumnDef>)
      .filter(([, column]) => column.persist !== false)
  );

  const derivedColumns = Object.fromEntries(getDerivableFields(tableName));

  return {
    ...baseColumns,
    ...derivedColumns,
  };
}

async function getListOfTable(
  pool: Pool,
  res: express.Response,
  tableName: TableKey,
  query: express.Request["query"]
) {
  try {
    const defaultSort = getPkFields(tableName);

    const { dataQuery, dataValues, countQuery, countValues } = buildListQuery(
      getBaseSelectQuery(tableName),
      query,
      getListFilterConfig(tableName),
      defaultSort
    );

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataValues),
      pool.query(countQuery, countValues),
    ]);

    return res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    });
  } catch (error) {
    console.error(`Error fetching ${tableName}:`, error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getRowByPKs(
  pool: Pool,
  tableName: TableKey,
  pkValues: unknown[]
) {
  const whereArguments = columnNamesEqualsNumber(
    getPkFields(tableName),
    1,
    " AND "
  );

  const queryStatement = `
    SELECT *
    FROM ${tableName}
    WHERE ${whereArguments}
  `;

  return tryQuery(pool, queryStatement, pkValues);
}

async function getRowOfTable(
  pool: Pool,
  res: express.Response,
  tableName: TableKey,
  query: express.Request["query"],
  entityName: string
) {
  const pk = validateOnlyPk(tableName, query);

  if (sendErrorsIfInvalid(res, pk)) {
    return;
  }

  const pkFields = getPkFields(tableName);

  const pkValues = pkFields.map(
    (pkField) => (pk.data as Record<string, unknown>)[pkField]
  );

  const responseQuery: QueryResponse = await getRowByPKs(
    pool,
    tableName,
    pkValues
  );

  if (!responseQuery.success) {
    return sendErrorMessage(res, responseQuery.message);
  }

  if (responseQuery.data.rowCount === 0) {
    return sendNotFoundMessage(res, entityName);
  }

  return sendSuccessOperationMessage(
    res,
    entityName,
    responseQuery.data.rows[0],
    "fetched",
    200
  );
}
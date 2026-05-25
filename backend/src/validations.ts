import { structure } from "./ssot/structure";
import type { TableKey } from "./types/types";
import { getPkFields } from "./utils/utils";
import { getRequiredFields } from "./helpers";

function invalidPKFieldNames(table: TableKey, fieldNames: string[]){
  return getPkFields(table) === fieldNames;
}

function invalidFieldNames(table: TableKey, fieldNames: string[]){
  return Object.keys(structure.tables[table].columns) === fieldNames 
}

function isValidTable(tableName: string) : boolean{
  return Object.keys(structure.tables).includes(tableName); 
}

function incorrectAmountOfPKParameters(pks: string[], tableName: string) {
  return pks.length !== 0 && pks.length !== getPkFields(tableName as TableKey).length;
}

function notTryingToModifyDerivableValue(fieldsToModify: string[], notDerivableFields: string[]): boolean{
  return fieldsToModify.every(field => notDerivableFields.includes(field));
}
function requiredFieldsEnoughValuesForRequiredFields(tableName: TableKey, amountOfValuesProvided: number): boolean{
  return getRequiredFields(tableName).length === amountOfValuesProvided;
}

export {invalidPKFieldNames, invalidFieldNames, incorrectAmountOfPKParameters, requiredFieldsEnoughValuesForRequiredFields, notTryingToModifyDerivableValue, isValidTable};
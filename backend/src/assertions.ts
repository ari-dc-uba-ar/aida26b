import { isValidTable, incorrectAmountOfPKParameters, invalidFieldNames, invalidPKFieldNames, notTryingToModifyDerivableValue, requiredFieldsEnoughValuesForRequiredFields} from "./validations";
import express from 'express';
import type { TableKey } from "./types/types";
import { getNotDerivableFields } from "./helpers";
import {sendInvalidInstanceMessage, sendNotFoundMessage} from "./statusMessages";

function assertValidGetInstance(tableName: string, res: express.Response, pksValues: string[], entityName: string, pkFieldsNames: string[]){
  if (!isValidTable(tableName)){
      sendNotFoundMessage(res, `Invalid table`);
      return false;
    }  
    if (incorrectAmountOfPKParameters(pksValues, tableName)){
      sendInvalidInstanceMessage(res, `Insufficient amount of fields to identify a/an ${entityName}`);
      return false;
    }
    if (invalidPKFieldNames(tableName as TableKey, pkFieldsNames)){
      sendInvalidInstanceMessage(res, `Invalid fields to identify a/an ${entityName}`);
      return false;
    }
    return true;
}

function assertValidPutInstance(tableName: string, res: express.Response, pksValues: string[], entityName: string, fieldNames: string[], newValues: any[], pkFieldsNames: string[]){
  if (!isValidTable(tableName)){
    sendNotFoundMessage(res, `Invalid table`);
    return false;
  }
  if (incorrectAmountOfPKParameters(pksValues, tableName)){
    sendInvalidInstanceMessage(res, `Insufficient amount of fields to identify a/an ${entityName}`);
    return false;
  } 
  if (invalidPKFieldNames(tableName as TableKey, pkFieldsNames)){
    sendInvalidInstanceMessage(res, `Invalid fields to identify a/an ${entityName}`);
    return false;
  }
  if (invalidFieldNames(tableName as TableKey, fieldNames)){
    sendInvalidInstanceMessage(res, `Invalid fields to modify`);
    return false;
  }
  if (!notTryingToModifyDerivableValue(pkFieldsNames, getNotDerivableFields(tableName as TableKey))){
    sendInvalidInstanceMessage(res, `Cant modify derivable fields`);
    return false;
  } 
  if (requiredFieldsEnoughValuesForRequiredFields(tableName as TableKey, newValues.length)){
    sendInvalidInstanceMessage(res, `Need to provide values for, at least, al required ${entityName} fields`);
    return false;
  }
  return true;
}

function assertValidPostInstance(tableName: string, res: express.Response, fieldsToModify: string[], pkFieldNames: string[], pkValues: any[], newValues: any[], entityName: string){
  if (!isValidTable(tableName as TableKey)){
    sendNotFoundMessage(res, `Invalid table`);
    return false;
  }
  if (!notTryingToModifyDerivableValue(fieldsToModify, getNotDerivableFields(tableName as TableKey))){
    sendInvalidInstanceMessage(res, `Cant modify derivable fields`);
    return false;
  }
  if (incorrectAmountOfPKParameters(pkValues, tableName)){
    sendInvalidInstanceMessage(res, `Insufficient amount of fields to identify a/an ${entityName}`);
    return false;
  }
  if (invalidFieldNames(tableName as TableKey, fieldsToModify)){
    sendInvalidInstanceMessage(res, `Invalid fields to modify a/an ${entityName}`);
    return false;
  }
  if (invalidPKFieldNames(tableName as TableKey, pkFieldNames)){
    sendInvalidInstanceMessage(res, `Invalid fields to identify a/an ${entityName}`);
    return false;
  }
  if (requiredFieldsEnoughValuesForRequiredFields(tableName as TableKey, newValues.length)){
    sendInvalidInstanceMessage(res, `Need to provide values for, at least, all required ${entityName} fields`);
    return false;
  }
  return true;
}

function assertValidDeleteInstance(tableName: string, res: express.Response, pkFieldsNames: string[], entityName: string){
  if (!isValidTable(tableName)){
    sendNotFoundMessage(res, `Invalid table`);
    return false;
  }
  if (incorrectAmountOfPKParameters(pkFieldsNames, tableName)){
    sendInvalidInstanceMessage(res, `Insufficient amount of fields to identify a/an ${entityName}`);
    return false;
  }
  if (invalidPKFieldNames(tableName as TableKey, pkFieldsNames)){
    sendInvalidInstanceMessage(res, `Invalid fields to identify a/an ${entityName}`);
    return false;
  }
  return true;
}

export{ assertValidDeleteInstance, assertValidGetInstance, assertValidPostInstance, assertValidPutInstance};
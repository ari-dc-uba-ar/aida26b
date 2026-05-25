import express from 'express';

/*Messages*/
function sendErrorMessage(res: express.Response, responseMessage: string){
  return res.status(500).json({success: false, data: undefined, message: responseMessage})
}

function sendSuccessOperationMessage(res: express.Response, entityName: string, data: any, operationDone: string, successCode: number){
  return res.status(successCode).json({success: true, data: data, message: `${entityName} ${operationDone} successfully`});
}

function sendInvalidInstanceMessage(res: express.Response, message: string){
  res.status(400).json({success: false, data: undefined, message: message});
}
function sendNotFoundMessage(res: express.Response, message: string){
  res.status(404).json({success: false, data: undefined, message: message});
}
export{sendErrorMessage, sendInvalidInstanceMessage, sendNotFoundMessage, sendSuccessOperationMessage}
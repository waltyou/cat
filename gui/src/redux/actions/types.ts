// Action types
export const UPDATE_STATUS = 'UPDATE_STATUS';
export const UPDATE_RESPONSE = 'UPDATE_RESPONSE';
export const SET_ERROR = 'SET_ERROR';
export const CLEAR_ERROR = 'CLEAR_ERROR';

// Action interfaces
export interface UpdateStatusAction {
  type: typeof UPDATE_STATUS;
  payload: string;
}

export interface UpdateResponseAction {
  type: typeof UPDATE_RESPONSE;
  payload: string;
}

export interface SetErrorAction {
  type: typeof SET_ERROR;
  payload: Error;
}

export interface ClearErrorAction {
  type: typeof CLEAR_ERROR;
}

// Union type for all actions
export type AppActionTypes = 
  | UpdateStatusAction 
  | UpdateResponseAction 
  | SetErrorAction 
  | ClearErrorAction;

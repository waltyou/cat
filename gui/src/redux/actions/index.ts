import {
  UPDATE_STATUS,
  UPDATE_RESPONSE,
  SET_ERROR,
  CLEAR_ERROR,
  UpdateStatusAction,
  UpdateResponseAction,
  SetErrorAction,
  ClearErrorAction
} from './types';

// Action creators
export const updateStatus = (status: string): UpdateStatusAction => ({
  type: UPDATE_STATUS,
  payload: status
});

export const updateResponse = (response: string): UpdateResponseAction => ({
  type: UPDATE_RESPONSE,
  payload: response
});

export const setError = (error: Error): SetErrorAction => ({
  type: SET_ERROR,
  payload: error
});

export const clearError = (): ClearErrorAction => ({
  type: CLEAR_ERROR
});

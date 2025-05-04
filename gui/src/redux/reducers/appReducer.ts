import {
  AppActionTypes,
  UPDATE_STATUS,
  UPDATE_RESPONSE,
  SET_ERROR,
  CLEAR_ERROR
} from '../actions/types';

// Define the state interface
interface AppState {
  status: string;
  response: string | null;
  error: Error | null;
}

// Initial state
const initialState: AppState = {
  status: 'Ready',
  response: null,
  error: null
};

// Reducer function
const appReducer = (state = initialState, action: AppActionTypes): AppState => {
  switch (action.type) {
    case UPDATE_STATUS:
      return {
        ...state,
        status: action.payload
      };
    
    case UPDATE_RESPONSE:
      return {
        ...state,
        response: action.payload
      };
    
    case SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
    
    case CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

export default appReducer;

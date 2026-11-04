export const ASSET_URLS = {
  LOGO: 'assets/logo-black.png'
};

// Relative so requests go through the dev proxy (src/proxy.conf.json) / Netlify proxy (src/_redirects)
export const API_URLS = {
  PUBLIC_LISTING: '/api/v1/public/listing',
  PUBLIC_CREATE: '/api/v1/public/create',
  LOGIN: '/api/v1/auth/login',
  CHANGE_PASSWORD: '/api/v1/auth/change-password',
  REFRESH: '/api/v1/auth/refresh',
  // OTP (public) -- used to verify the phone number before registration
  OTP_CREATE: '/api/v1/public/otp/create',
  OTP_VALIDATE: '/api/v1/public/otp/validate'
};

// Company the auth APIs log users into
export const COMPANY_SUBDOMAIN = 'mygenie';

// Role given to every self-registered customer (from the MyGenie Public APIs Postman collection)
export const CUSTOMER_ROLE_ID = '6ad209407f35a5a6ecccb545';

// Registration also creates the user's Customer record (needed for booking)
export const CUSTOMER_MODULE_ID = '6ad0c11c72189af6ea6e8f2d';
export const CUSTOMER_CREATE_URL = `/api/v1/module-configs/${CUSTOMER_MODULE_ID}/customers`;
export const CUSTOMER_TYPE_ID = '6adb76439c858153e5e883f1';

// Master pincodes for the register address dropdown (authenticated). Each item's id is a masterPincodeId
export const PINCODES_URL = '/api/v1/master-metadata/pincodes';

// Booking (Inquiry Call) APIs -- authenticated, called with the login access token
const MODULE_CONFIGS = '/api/v1/module-configs';
// Company dropdown that holds the bookable time slots ("10-11 AM", ...)
const SLOT_DROPDOWN_CONFIG_ID = '6ad0dacf72189af6ea6e90fe';
const CALL_MODULE_ID = '6ad0d78872189af6ea6e9090';
// Reference fields on the Inquiry Call form; their options are Customer / Product records
const CALL_CUSTOMER_FIELD_ID = '6ad0da6972189af6ea6e90e4';
const CALL_PRODUCT_FIELD_ID = '6ad0db0472189af6ea6e910d';

export const BOOKING_URLS = {
  // GET /<id> returns { value, data: <record> }
  CUSTOMER_OPTIONS: `${MODULE_CONFIGS}/${CALL_MODULE_ID}/fields/${CALL_CUSTOMER_FIELD_ID}/reference-options`,
  PRODUCT_OPTIONS: `${MODULE_CONFIGS}/${CALL_MODULE_ID}/fields/${CALL_PRODUCT_FIELD_ID}/reference-options`,
  SLOT_RECORDS: `/api/v1/company-dropdown-configs/${SLOT_DROPDOWN_CONFIG_ID}/records`,
  CALL_CREATE_CONTEXT: `${MODULE_CONFIGS}/${CALL_MODULE_ID}/calls/create-context`,
  CALLS: `${MODULE_CONFIGS}/${CALL_MODULE_ID}/calls`,
  // Payment request created for a Call, right after the Call is created
  PAYMENT_REQUESTS: `${MODULE_CONFIGS}/${CALL_MODULE_ID}/payments/requests`
};

// Role of the professionals a new Inquiry Call can be assigned to
export const ASSIGNEE_ROLE_ID = '6ad0c09a72189af6ea6e8f1d';

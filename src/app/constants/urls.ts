export const ASSET_URLS = {
  LOGO: 'assets/logo-black.png'
};

// Relative so requests go through the dev proxy (src/proxy.conf.json) / Netlify proxy (src/_redirects)
export const API_URLS = {
  PUBLIC_LISTING: '/api/v1/public/listing',
  PUBLIC_CREATE: '/api/v1/public/create',
  LOGIN: '/api/v1/auth/login',
  CHANGE_PASSWORD: '/api/v1/auth/change-password'
};

// Company the auth APIs log users into
export const COMPANY_SUBDOMAIN = 'mygenie';

// Role given to every self-registered customer (from the MyGenie Public APIs Postman collection)
export const CUSTOMER_ROLE_ID = '6ac7575ed27273d53e3ddade';

// Registration also creates the user's Customer record (needed for booking)
export const CUSTOMER_CREATE_URL = '/api/v1/module-configs/6aaa8985b572f6609c2a7e00/customers';
export const CUSTOMER_TYPE_ID = '6aad1dc3739f6daeac755e9d';

// Master pincodes for the register address dropdown (authenticated). Each item's id is a masterPincodeId
export const PINCODES_URL = '/api/v1/master-metadata/pincodes';

// Booking (Inquiry Call) APIs -- authenticated, called with the login access token
const MODULE_CONFIGS = '/api/v1/module-configs';
// Company dropdown that holds the bookable time slots ("10-11 AM", ...)
const SLOT_DROPDOWN_CONFIG_ID = '6ac9ed126feb65d785a78ea0';
const CALL_MODULE_ID = '6aaa8997b572f6609c2a7e03';
// Reference fields on the Inquiry Call form; their options are Customer / Product records
const CALL_CUSTOMER_FIELD_ID = '6aaa8a67b572f6609c2a7e28';
const CALL_PRODUCT_FIELD_ID = '6aaa8aafb572f6609c2a7e3a';

export const BOOKING_URLS = {
  // GET /<id> returns { value, data: <record> }
  CUSTOMER_OPTIONS: `${MODULE_CONFIGS}/${CALL_MODULE_ID}/fields/${CALL_CUSTOMER_FIELD_ID}/reference-options`,
  PRODUCT_OPTIONS: `${MODULE_CONFIGS}/${CALL_MODULE_ID}/fields/${CALL_PRODUCT_FIELD_ID}/reference-options`,
  SLOT_RECORDS: `/api/v1/company-dropdown-configs/${SLOT_DROPDOWN_CONFIG_ID}/records`,
  CALL_CREATE_CONTEXT: `${MODULE_CONFIGS}/${CALL_MODULE_ID}/calls/create-context`,
  CALLS: `${MODULE_CONFIGS}/${CALL_MODULE_ID}/calls`
};

// Role of the professionals a new Inquiry Call can be assigned to
export const ASSIGNEE_ROLE_ID = '6aa7ea40def5ae2dc9f647dc';

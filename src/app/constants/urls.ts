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

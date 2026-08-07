import { getServerUrl } from "../utils/getServerUrl";

export const env = {

    apiUrl: getServerUrl(),

    billingEnabled: import.meta.env.VITE_BILLING_ENABLED !== 'false',

    sharedSecret: import.meta.env.VITE_SHARED_SECRET || ''

};
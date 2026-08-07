// Socket Auth - shared secret venue, dikirim tiap kali connect ke room manapun
export const securityConfig = {
    sharedSecret: import.meta.env.VITE_SHARED_SECRET || ''
};

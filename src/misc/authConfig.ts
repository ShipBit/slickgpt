import { PUBLIC_MSAL_CLIENT_ID, PUBLIC_MSAL_REDIRECT_URL } from '$env/static/public';
import { BrowserCacheLocation } from '@azure/msal-browser';

export const b2cPolicies = {
	names: {
		signUpSignIn: 'B2C_1_signupsignin',
		forgotPassword: 'B2C_1_passwordreset',
		editProfile: 'B2C_1_editprofile'
	},
	authorities: {
		signUpSignIn: {
			authority: 'https://shipbit.b2clogin.com/shipbit.onmicrosoft.com/B2C_1_signupsignin'
		},
		forgotPassword: {
			authority: 'https://shipbit.b2clogin.com/shipbit.onmicrosoft.com/B2C_1_passwordreset'
		},
		editProfile: {
			authority: 'https://shipbit.b2clogin.com/shipbit.onmicrosoft.com/B2C_1_editprofile'
		}
	},
	authorityDomain: 'shipbit.b2clogin.com'
};

export const msalConfig = {
	auth: {
		clientId: PUBLIC_MSAL_CLIENT_ID,
		redirectUri: PUBLIC_MSAL_REDIRECT_URL,
		authority: b2cPolicies.authorities.signUpSignIn.authority,
		knownAuthorities: [
			b2cPolicies.authorities.signUpSignIn.authority,
			b2cPolicies.authorities.forgotPassword.authority,
			b2cPolicies.authorities.editProfile.authority
		]
	},
	cache: {
		cacheLocation: BrowserCacheLocation.LocalStorage,
		storeAuthStateInCookie: false
	}
};

import { writable, type Writable } from 'svelte/store';
import {
	PublicClientApplication,
	type PopupRequest,
	type SilentRequest,
	InteractionRequiredAuthError,
	ServerError,
	type AccountInfo,
	type RedirectRequest,
	type EndSessionRequest
} from '@azure/msal-browser';
import { b2cPolicies, msalConfig } from './authConfig';
import { account } from '$misc/stores';

export class AuthService {
	token: Writable<string> = writable('');

	private static instance: Promise<AuthService> | null = null;
	private msal: PublicClientApplication;
	private refreshTokenExpirationOffsetSeconds = 14400;

	private loginRequest: PopupRequest = {
		scopes: ['openid', 'profile', 'https://shipbit.onmicrosoft.com/wingman-api/Wingman.Use']
	};

	private redirectLoginRequest: RedirectRequest = {
		...this.loginRequest
	};

	private silentRequest: SilentRequest = {
		...this.loginRequest,
		forceRefresh: false
	};

	constructor() {
		this.msal = new PublicClientApplication(msalConfig);
	}

	public async init() {
		await this.msal.initialize();

		this.msal
			.handleRedirectPromise()
			.then((response) => {
				if (response) {
					account.set(response.account);
					this.updateToken(response.accessToken);
				}
			})
			.catch((error) => {
				if (error instanceof ServerError && error.errorMessage.includes('AADB2C90118')) {
					// Invoke password reset user flow
					this.initiatePasswordReset();
				} else {
					console.error(error);
				}
			});

		this.refreshToken(true);

		// timeout to refresh token
		setInterval(
			() => {
				this.refreshToken();
			},
			1000 * 60 * 30
		);
	}

	public static getInstance(): Promise<AuthService> {
		if (!this.instance) {
			this.instance = (async () => {
				const serviceInstance = new AuthService();
				await serviceInstance.init();
				return serviceInstance;
			})();
		}
		return this.instance;
	}

	public async login() {
		try {
			await this.msal.loginRedirect(this.redirectLoginRequest);
		} catch (error) {
			console.error(error);
		}
	}

	public async editProfile() {
		try {
			const editProfileRequest = {
				...this.loginRequest,
				authority: b2cPolicies.authorities.editProfile.authority
			};

			await this.msal.loginRedirect(editProfileRequest);
		} catch (error) {
			console.error(error);
		}
	}

	public async refreshToken(forceRefresh: boolean = false) {
		const account = this.getAccount();
		if (!account) {
			return null;
		}
		this.silentRequest.account = account;
		this.silentRequest.forceRefresh = forceRefresh;

		if (forceRefresh) {
			this.silentRequest.refreshTokenExpirationOffsetSeconds =
				this.refreshTokenExpirationOffsetSeconds;
		} else {
			this.silentRequest.refreshTokenExpirationOffsetSeconds = undefined;
		}

		try {
			const response = await this.msal.acquireTokenSilent(this.silentRequest);

			this.updateToken(response.accessToken);

			return response?.accessToken;
		} catch (error) {
			if (error instanceof InteractionRequiredAuthError) {
				await this.login();
			} else {
				console.error(error);
			}
		}
	}

	public async initiatePasswordReset() {
		const resetPasswordRequest = {
			...this.loginRequest,
			authority: b2cPolicies.authorities.forgotPassword.authority
		};

		await this.msal.loginRedirect(resetPasswordRequest);
	}

	public async logout() {
		const logoutRequest: EndSessionRequest = {
			account: this.getAccount(),
			postLogoutRedirectUri: '/'
		};

		account.set(null);
		this.updateToken('');
		await this.msal.logoutRedirect(logoutRequest);
	}

	public getAccount(): AccountInfo | null {
		const currentAccounts = this.msal.getAllAccounts();

		if (!currentAccounts || currentAccounts.length < 1) {
			return null;
		} else if (currentAccounts.length > 1) {
			// Add your account choosing logic here
			console.warn('Multiple accounts detected.');
			return null;
		}
		return currentAccounts[0];
	}

	private updateToken(token: string) {
		this.token.set(token);
	}
}

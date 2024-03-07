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
import { account } from './stores';

export class AuthService {
	private static instance: Promise<AuthService> | null = null;
	private msal: PublicClientApplication;

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

	token: Writable<string> = writable('');

	constructor() {
		this.msal = new PublicClientApplication(msalConfig);
	}

	public async init() {
		await this.msal.initialize();

		this.msal
			.handleRedirectPromise()
			.then(async (response) => {
				if (response) {
					// Coming from a redirect
					account.set(response.account);
					this.updateToken(response.accessToken);
				} else {
					// Normal page load
					const firstAccount = this.getAccount();
					if (firstAccount) {
						await this.refreshToken(true);
					} else {
						await this.login();
					}
				}
			})
			.catch(async (error) => {
				if (error instanceof ServerError && error.errorMessage.includes('AADB2C90118')) {
					// Invoke password reset user flow
					this.initiatePasswordReset();
				} else {
					console.error(error);
				}
				const firstAccount = this.getAccount();
				if (firstAccount) {
					await this.refreshToken(false);
				} else {
					await this.login();
				}
			});

		// timeout to refresh token
		setInterval(
			() => {
				this.refreshToken(true);
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
		const userAccount = this.getAccount();
		if (!userAccount) {
			account.set(null);
			return null;
		}

		this.silentRequest.account = userAccount;
		this.silentRequest.forceRefresh = forceRefresh;

		if (forceRefresh) {
			this.msal.clearCache();
		}

		try {
			const response = await this.msal.acquireTokenSilent(this.silentRequest);

			this.updateToken(response.accessToken);
			account.set(response.account);

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
		}
		return currentAccounts[0];
	}

	private updateToken(token: string) {
		this.token.set(token);
	}
}

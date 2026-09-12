export type MercadoPagoEnvironment = "TEST" | "PRODUCTION";

export type MercadoPagoAdminSettings = {
  environment: MercadoPagoEnvironment;
  public_key: string | null;
  enabled: boolean;
  access_token_configured: boolean;
  webhook_secret_configured: boolean;
  active: boolean;
  updated_at: string;
};

export type MercadoPagoPublicSettings = {
  environment: MercadoPagoEnvironment;
  public_key: string | null;
  enabled: boolean;
};

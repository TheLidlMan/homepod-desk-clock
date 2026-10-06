export type SubmitRequest = (
  path: string,
  body: Record<string, unknown>,
  success: string,
  method?: "PUT" | "POST" | "DELETE",
) => void;

export type NetworkFormState = {
  recoveryProtected: boolean;
  staticIp: boolean;
  ntpFromDhcp: boolean;
};

export type SecurityFormState = {
  apiAuth: boolean;
  otaAuth: boolean;
  directOta: boolean;
};

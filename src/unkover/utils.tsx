import pkceChallenge from "pkce-challenge";

export type PKCECodePair = {
  codeVerifier: string;
  codeChallenge: string;
  createdAt: Date;
};

export const createPKCECodes = (): PKCECodePair => {
  const challenge = pkceChallenge(64);
  const createdAt = new Date();
  const codePair = {
    codeVerifier: challenge.code_verifier,
    codeChallenge: challenge.code_challenge,
    createdAt,
  };
  return codePair;
};

export const toSnakeCase = (str: string): string => {
  return str
    .split(/(?=[A-Z])/)
    .join("_")
    .toLowerCase();
};

export const toUrlEncoded = (obj: any): string => {
  return Object.keys(obj)
    .map(
      (k) =>
        encodeURIComponent(toSnakeCase(k)) + "=" + encodeURIComponent(obj[k])
    )
    .join("&");
};

export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{10,20}$/;

export function isPasswordPolicyValid(password: string) {
    return PASSWORD_POLICY_REGEX.test(String(password ?? ""));
}

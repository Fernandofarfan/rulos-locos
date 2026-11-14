let instance: import('otplib').OTP | null = null;
const importOtplib = new Function('return import("otplib")') as () => Promise<typeof import('otplib')>;

export async function getTotp(): Promise<import('otplib').OTP> {
    if (instance) return instance;
    const { OTP } = await importOtplib();
    instance = new OTP();
    return instance;
}

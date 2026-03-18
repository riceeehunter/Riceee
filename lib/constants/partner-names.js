export const DEFAULT_PARTNER_NAMES = {
  partnerOneName: "Partner 1",
  partnerTwoName: "Partner 2",
};

export function resolvePartnerNames(user) {
  const partnerOneName = user?.partnerOneName?.trim() || DEFAULT_PARTNER_NAMES.partnerOneName;
  const partnerTwoName = user?.partnerTwoName?.trim() || DEFAULT_PARTNER_NAMES.partnerTwoName;

  return {
    partnerOneName,
    partnerTwoName,
    bothLabel: `${partnerOneName} x ${partnerTwoName}`,
  };
}

/**
 * Doctors usually enter an age, not a birth date. Storing an estimated
 * date of birth keeps the age correct as years pass.
 */
export const dateOfBirthFromAge = (age: number, today = new Date()) =>
  new Date(
    Date.UTC(today.getUTCFullYear() - age, today.getUTCMonth(), today.getUTCDate()),
  );

export const ageFromDateOfBirth = (
  dateOfBirth: Date | string | null | undefined,
  at = new Date(),
) => {
  if (!dateOfBirth) return null;

  const born = new Date(dateOfBirth);
  let age = at.getUTCFullYear() - born.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - born.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < born.getUTCDate())) {
    age--;
  }
  return age;
};

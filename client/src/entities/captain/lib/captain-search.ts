import { TCaptain } from '../model/captain';

export function displayFn(captain: TCaptain): string {
  return captain ? captain.nickname : '';
}

export function hasSuggestedFilter(
  captain: TCaptain,
  suggestedString: string,
): boolean {
  return (
    captain.number.toString().includes(suggestedString) ||
    // captain.name.toLowerCase().includes(suggestedString) ||
    // captain.surname.toLowerCase().includes(suggestedString) ||
    captain.nickname.toLowerCase().includes(suggestedString)
  );
}

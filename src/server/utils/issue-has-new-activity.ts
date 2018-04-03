import {UserRecord} from '../models/userModel';

export async function issueHasNewActivity(
    userRecord: UserRecord|null,
    lastActivity: number,
    userLastViewed: number|null): Promise<boolean> {
  if (!userRecord) {
    return false;
  }

  const featureEnabledAt = userRecord.featureLastViewed.enabledAt;
  // We need to account for when the feature was first used and when
  // the user last interacted with the issue
  if (!userLastViewed || userLastViewed < featureEnabledAt) {
    userLastViewed = featureEnabledAt;
  }

  return lastActivity > userLastViewed;
}

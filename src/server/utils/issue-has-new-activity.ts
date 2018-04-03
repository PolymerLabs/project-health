import {FeatureDetails} from '../models/userModel';

export async function issueHasNewActivity(
    featureLastViewed: FeatureDetails|null,
    lastActivity: number,
    userLastViewed: number|null): Promise<boolean> {
  if (!featureLastViewed) {
    return false;
  }

  // We need to account for when the feature was first used and when
  // the user last interacted with the issue
  if (!userLastViewed || userLastViewed < featureLastViewed.enabledAt) {
    userLastViewed = featureLastViewed.enabledAt;
  }

  return lastActivity > userLastViewed;
}

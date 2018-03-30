import {userModel} from '../models/userModel';

export async function issueHasNewActivity(
    username: string, lastActivity: number, userLastViewed: number|null):
    Promise<boolean> {
  const userRecord = await userModel.getUserRecord(username);
  if (!userRecord) {
    return false;
  }

  let lastviewedFeature = userRecord.featureLastViewed;
  if (!lastviewedFeature) {
    lastviewedFeature = {
      enabledAt: Date.now(),
    };
    await userModel.setFeatureData(
        username, 'featureLastViewed', lastviewedFeature);
  }

  // We need to account for when the feature was first used and when
  // the user last interacted with the issue
  if (!userLastViewed || userLastViewed < lastviewedFeature.enabledAt) {
    userLastViewed = lastviewedFeature.enabledAt;
  }

  return (lastActivity > userLastViewed);
}

import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { TrackingPermissionResult } from './types';

export async function requestTrackingPermissions(): Promise<TrackingPermissionResult> {
  if (!await TaskManager.isAvailableAsync()) return { status: 'background-unavailable' };
  if (!await Location.hasServicesEnabledAsync()) return { status: 'services-disabled' };

  let foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    return { status: 'foreground-denied', canAskAgain: foreground.canAskAgain };
  }

  if ((Platform.OS === 'android' && foreground.android?.accuracy !== 'fine')
    || (Platform.OS === 'ios' && foreground.ios?.accuracy === 'reduced')) {
    return { status: 'precise-location-required' };
  }

  let background = await Location.getBackgroundPermissionsAsync();
  if (!background.granted) background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) {
    return { status: 'background-denied', canAskAgain: background.canAskAgain };
  }
  if (!await Location.isBackgroundLocationAvailableAsync()) {
    return { status: 'background-unavailable' };
  }

  return { status: 'granted' };
}

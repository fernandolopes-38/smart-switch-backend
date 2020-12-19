import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
admin.initializeApp();
const rt = admin.database();

import * as iot from '@google-cloud/iot';
const iotClient = new iot.v1.DeviceManagerClient({
  // optional auth parameters.
});
if (iotClient === undefined) {
  console.log('Did not instantiate client.');
}
const projectId = 'smarthome-f13';
const cloudRegion = 'us-central1';
const registryId = 'smart-switch';

exports.caller = functions.https.onRequest(async (req, res) => {
  await createDeviceRegistry('test-registry', 'devicePubSubTopic');
  res.end();
});

async function createDeviceRegistry(newRegistryId: string, pubsubTopicId: string) {
  const topicPath = `projects/${projectId}/topics/${pubsubTopicId}`;
  // Construct request
  const newParent = iotClient.locationPath(projectId, cloudRegion);
  const deviceRegistry = {
    eventNotificationConfigs: [
      {
        pubsubTopicName: topicPath,
      },
    ],
    id: newRegistryId,
  };
  const request = {
    parent: newParent,
    deviceRegistry: deviceRegistry,
  };

  const [response] = await iotClient.createDeviceRegistry(request);

  console.log('Successfully created registry');
  console.log(response);
}

async function quickstart() {
  const _projectId = await iotClient.getProjectId();
  console.log('_projectId', _projectId);
  const parent = iotClient.locationPath(_projectId, 'us-central1');
  const [resources] = await iotClient.listDeviceRegistries({parent});
  console.log(`${resources.length} resource(s) found.`);
  for (const resource of resources) {
    console.log('RE');
    console.log(resource);
  }
}

(async () => {
  await quickstart();
});

exports.smartSwitchCommand = functions.https.onCall(async (data, _) => {
  const { state, deviceId } = data;
  await quickstart();
  console.log('state', state);
  console.log('deviceId', deviceId);
  try {
    const commandResponse = await sendSwitchCommand(deviceId, state);
    console.log('commandResponse', commandResponse);
    if (commandResponse.code === 5) {
      return { message: commandResponse, code: commandResponse.code };
    } else if (commandResponse.code === 9) {
      console.log('commandResponse.details', commandResponse.details);
      await rt.ref(`/smartSwitches/${deviceId}`).update({state: 'off'});
    }
    return {message: commandResponse, code: commandResponse.code};
  } catch (err) {
    console.log('ERR0R.', err);
    return {message: err};
  }
});

const sendSwitchCommand = async (deviceId: any, commandMessage: ArrayBuffer | SharedArrayBuffer) => {
  const formattedName = iotClient.devicePath(
    projectId,
    cloudRegion,
    registryId,
    deviceId
  );
  const binaryData = Buffer.from(commandMessage);
  const request = {
    name: formattedName,
    binaryData: binaryData,
  };
  try {
    const responses = await iotClient.sendCommandToDevice(request);
    console.log('RES::', responses);
    console.log('Sent command: ', responses[0]);
    return responses[0];
  } catch(err) {
    console.error('Could not send command:', err);
    return err;
  }
};
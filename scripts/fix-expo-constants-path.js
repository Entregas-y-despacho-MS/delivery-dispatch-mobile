const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.join(
  process.cwd(),
  'node_modules',
  'expo-constants',
  'scripts',
  'get-app-config-ios.sh',
);
const podspecPath = path.join(
  process.cwd(),
  'node_modules',
  'expo-constants',
  'ios',
  'EXConstants.podspec',
);
const podsProjectPath = path.join(
  process.cwd(),
  'ios',
  'Pods',
  'Pods.xcodeproj',
  'project.pbxproj',
);
const appProjectPath = path.join(
  process.cwd(),
  'ios',
  'Despachos.xcodeproj',
  'project.pbxproj',
);

if (!fs.existsSync(scriptPath)) {
  process.exit(0);
}

const source = fs.readFileSync(scriptPath, 'utf8');
const unquoted = 'PROJECT_DIR_BASENAME=$(basename $PROJECT_DIR)';
const quoted = 'PROJECT_DIR_BASENAME=$(basename "$PROJECT_DIR")';

if (source.includes(unquoted)) {
  fs.writeFileSync(scriptPath, source.replace(unquoted, quoted));
}

if (fs.existsSync(podspecPath)) {
  const podspec = fs.readFileSync(podspecPath, 'utf8');
  const unquotedInvocation = String.raw`:script => "bash -l -c \"#{env_vars}$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\""`;
  const quotedInvocation = String.raw`:script => "bash -l -c \"\\\"#{env_vars}$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\"\""`;

  if (podspec.includes(unquotedInvocation)) {
    fs.writeFileSync(podspecPath, podspec.replace(unquotedInvocation, quotedInvocation));
  }
}

if (fs.existsSync(podsProjectPath)) {
  const project = fs.readFileSync(podsProjectPath, 'utf8');
  const unquotedPhase = String.raw`shellScript = "bash -l -c \"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\"";`;
  const quotedPhase = String.raw`shellScript = "bash -l -c \"\\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\"\"";`;

  if (project.includes(unquotedPhase)) {
    fs.writeFileSync(podsProjectPath, project.replace(unquotedPhase, quotedPhase));
  }
}

if (fs.existsSync(appProjectPath)) {
  const project = fs.readFileSync(appProjectPath, 'utf8');
  const unquotedBundleScript = `\`\\"$NODE_BINARY\\" --print \\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\"\``;
  const quotedBundleScript = `\\"$(\\"$NODE_BINARY\\" --print \\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\")\\"`;

  if (project.includes(unquotedBundleScript)) {
    fs.writeFileSync(appProjectPath, project.replace(unquotedBundleScript, quotedBundleScript));
  }
}

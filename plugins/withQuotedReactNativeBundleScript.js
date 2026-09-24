const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const REACT_NATIVE_SCRIPT = `\`\\"$NODE_BINARY\\" --print \\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\"\``;
const QUOTED_REACT_NATIVE_SCRIPT = `\\"$(\\"$NODE_BINARY\\" --print \\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\")\\"`;

function withQuotedReactNativeBundleScript(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const { platformProjectRoot, projectName } = modConfig.modRequest;
      const projectPath = path.join(
        platformProjectRoot,
        `${projectName}.xcodeproj`,
        'project.pbxproj',
      );

      if (!fs.existsSync(projectPath)) {
        return modConfig;
      }

      const project = fs.readFileSync(projectPath, 'utf8');
      if (project.includes(REACT_NATIVE_SCRIPT)) {
        fs.writeFileSync(
          projectPath,
          project.replace(REACT_NATIVE_SCRIPT, QUOTED_REACT_NATIVE_SCRIPT),
        );
      }

      return modConfig;
    },
  ]);
}

module.exports = withQuotedReactNativeBundleScript;

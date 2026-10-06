// Adopts the UIScene life cycle on iOS. iOS 27 refuses to launch apps built
// with the iOS 27 SDK that still use the app-delegate-only life cycle (the app
// crashes in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
//
// Expo SDK 57 ships ExpoAppSceneDelegate for this, but its project template
// doesn't use it yet, so this plugin wires it up during `expo prebuild`:
//   1. Info.plist: declare a scene manifest that uses ExpoAppSceneDelegate.
//   2. AppDelegate.swift: expose the React Native factory to the scene delegate
//      and stop creating the window there (the scene delegate does that now).
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate'; // @objc name of ExpoAppSceneDelegate

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('with-scene-lifecycle: expected a Swift AppDelegate');
    }
    let src = cfg.modResults.contents;

    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      const classDecl = 'class AppDelegate: ExpoAppDelegate {';
      if (!src.includes(classDecl)) {
        throw new Error('with-scene-lifecycle: could not find the AppDelegate class declaration');
      }
      src = src.replace(classDecl, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    }

    // The scene delegate creates the window and starts React Native in it.
    const windowBlock =
      /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;
    if (windowBlock.test(src)) {
      src = src.replace(windowBlock, '');
    } else if (src.includes('UIWindow(frame: UIScreen.main.bounds)')) {
      throw new Error('with-scene-lifecycle: could not remove the window setup from AppDelegate');
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};

const { withStringsXml } = require('expo/config-plugins');

/**
 * Config plugin to change the crop button label from "CROP" to "Done"
 * in the Android image cropper (canhub/android-image-cropper).
 */
module.exports = function withCropButtonLabel(config, label = 'Done') {
  return withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string || [];

    // Remove existing entry if present
    const filtered = strings.filter(
      (s) => s.$?.name !== 'crop_image_menu_crop'
    );

    // Add override
    filtered.push({
      $: { name: 'crop_image_menu_crop' },
      _: label,
    });

    config.modResults.resources.string = filtered;
    return config;
  });
};

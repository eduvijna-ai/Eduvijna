import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Linking,
  Alert,
  Clipboard,
} from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { fullScreenModalOverlay, getFullScreenModalProps } from './fullScreenModal';

interface ShareOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  shareUrl: string;
}

const ShareOptionsModal: React.FC<ShareOptionsModalProps> = ({
  visible,
  onClose,
  shareUrl,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const handleWhatsAppShare = () => {
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(
      `Check out this assessment! 🎯\n\n${shareUrl}`
    )}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          Alert.alert('Error', 'WhatsApp is not installed on your device');
        }
      })
      .catch((err) => console.error('Error opening WhatsApp:', err));
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    
    Linking.canOpenURL(facebookUrl)
      .then(() => {
        return Linking.openURL(facebookUrl);
      })
      .catch((err) => console.error('Error opening Facebook:', err));
  };

  const handleEmailShare = () => {
    const emailUrl = `mailto:?subject=${encodeURIComponent('Check out this assessment!')}&body=${encodeURIComponent(
      `I found this interesting assessment and thought you might like it:\n\n${shareUrl}`
    )}`;
    
    Linking.canOpenURL(emailUrl)
      .then(() => {
        return Linking.openURL(emailUrl);
      })
      .catch((err) => console.error('Error opening email:', err));
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `Check out this assessment! 🎯`
    )}&url=${encodeURIComponent(shareUrl)}`;
    
    Linking.canOpenURL(twitterUrl)
      .then(() => {
        return Linking.openURL(twitterUrl);
      })
      .catch((err) => console.error('Error opening Twitter:', err));
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setString(shareUrl);
      setShowCopySuccess(true);
      setTimeout(() => {
        setShowCopySuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `Check out this assessment! 🎯\n\n${shareUrl}`,
        url: shareUrl,
        title: 'Share Assessment',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Modal visible={visible} onRequestClose={onClose} {...getFullScreenModalProps('slide')}>
      <View style={[fullScreenModalOverlay, styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.55)' }]}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Share Assessment ✨</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}>
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.successMessage, { color: colors.text }]}>
              Assessment Share Link Generated successfully! 🎉
            </Text>

            {/* Share URL Display */}
            <View style={[styles.urlContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.urlText, { color: colors.textSecondary }]} numberOfLines={1}>
                {shareUrl}
              </Text>
            </View>

            {/* Share Options */}
            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.surface }]}
              onPress={handleCopyLink}>
              <Text style={styles.shareOptionIcon}>📋</Text>
              <View style={styles.shareOptionContent}>
                <Text style={[styles.shareOptionTitle, { color: colors.text }]}>Copy Link</Text>
                <Text style={[styles.shareOptionDescription, { color: colors.textSecondary }]}>
                  Copy assessment URL to clipboard
                </Text>
              </View>
              {showCopySuccess && (
                <Text style={[styles.copiedText, { color: '#4CAF50' }]}>✓ Copied!</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.surface }]}
              onPress={handleWhatsAppShare}>
              <Text style={styles.shareOptionIcon}>💬</Text>
              <View style={styles.shareOptionContent}>
                <Text style={[styles.shareOptionTitle, { color: colors.text }]}>WhatsApp</Text>
                <Text style={[styles.shareOptionDescription, { color: colors.textSecondary }]}>
                  Share with contacts
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.surface }]}
              onPress={handleFacebookShare}>
              <Text style={styles.shareOptionIcon}>📘</Text>
              <View style={styles.shareOptionContent}>
                <Text style={[styles.shareOptionTitle, { color: colors.text }]}>Facebook</Text>
                <Text style={[styles.shareOptionDescription, { color: colors.textSecondary }]}>
                  Share on Facebook
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.surface }]}
              onPress={handleTwitterShare}>
              <Text style={styles.shareOptionIcon}>🐦</Text>
              <View style={styles.shareOptionContent}>
                <Text style={[styles.shareOptionTitle, { color: colors.text }]}>Twitter</Text>
                <Text style={[styles.shareOptionDescription, { color: colors.textSecondary }]}>
                  Tweet this assessment
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.surface }]}
              onPress={handleEmailShare}>
              <Text style={styles.shareOptionIcon}>✉️</Text>
              <View style={styles.shareOptionContent}>
                <Text style={[styles.shareOptionTitle, { color: colors.text }]}>Email</Text>
                <Text style={[styles.shareOptionDescription, { color: colors.textSecondary }]}>
                  Send via email
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareOption, { backgroundColor: colors.surface }]}
              onPress={handleNativeShare}>
              <Text style={styles.shareOptionIcon}>📱</Text>
              <View style={styles.shareOptionContent}>
                <Text style={[styles.shareOptionTitle, { color: colors.text }]}>More Options</Text>
                <Text style={[styles.shareOptionDescription, { color: colors.textSecondary }]}>
                  Share via other apps
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
              onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
  },
  modalContent: {
    padding: 20,
  },
  successMessage: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  urlContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  urlText: {
    fontSize: 14,
    textAlign: 'center',
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  shareOptionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  shareOptionContent: {
    flex: 1,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  shareOptionDescription: {
    fontSize: 13,
  },
  copiedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  doneButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ShareOptionsModal;

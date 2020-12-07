import React, {Component, createRef} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {TextInput} from 'react-native-gesture-handler';
import * as Keychain from 'react-native-keychain';
import Share from 'react-native-share';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {notesnook} from '../../../e2e/test.ids';
import {Actions} from '../../provider/Actions';
import {DDS} from '../../services/DeviceDetection';
import {
  eSendEvent,
  eSubscribeEvent,
  eUnSubscribeEvent,
  ToastEvent,
} from '../../services/EventManager';
import {getElevation, toTXT} from '../../utils';
import {db} from '../../utils/DB';
import {
  eCloseVaultDialog,
  eOnLoadNote,
  eOpenVaultDialog,
  refreshNotesPage,
} from '../../utils/Events';
import {tabBarRef} from '../../utils/Refs';
import {ph, pv, SIZE, WEIGHT} from '../../utils/SizeUtils';
import {Button} from '../Button';
import BaseDialog from '../Dialog/base-dialog';
import DialogButtons from '../Dialog/dialog-buttons';
import DialogHeader from '../Dialog/dialog-header';
import {updateEvent} from '../DialogManager/recievers';
import Seperator from '../Seperator';
import {Toast} from '../Toast';
import Paragraph from '../Typography/Paragraph';

const passInputRef = createRef();
const confirmPassRef = createRef();
const changePassInputRef = createRef();
export class VaultDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      wrongPassword: false,
      loading: false,
      note: {},
      vault: false,
      locked: true,
      permanant: false,
      goToEditor: false,
      share: false,
      passwordsDontMatch: false,
      deleteNote: false,
      focusIndex: null,
      biometricUnlock: false,
      isBiometryAvailable: false,
      fingerprintAccess: false,
      changePassword: false,
      copyNote:false
    };
    this.password = null;
    this.confirmPassword = null;
    this.newPassword = null;
  }

  componentDidMount() {
    eSubscribeEvent(eOpenVaultDialog, this.open);
    eSubscribeEvent(eCloseVaultDialog, this.close);
  }

  componentWillUnmount() {
    eUnSubscribeEvent(eOpenVaultDialog, this.open);
    eUnSubscribeEvent(eCloseVaultDialog, this.close);
  }

  /**
   *
   * @param {import('../../services/EventManager').vaultType} data
   */
  open = async (data) => {
    let biometry = await Keychain.getSupportedBiometryType();
    let available = false;
    let fingerprint = await Keychain.hasInternetCredentials('nn_vault');
    if (
      biometry === Keychain.BIOMETRY_TYPE.FINGERPRINT ||
      biometry === Keychain.BIOMETRY_TYPE.TOUCH_ID
    ) {
      available = true;
    }
    this.setState({
      visible: true,
      note: data.item,
      novault: data.novault,
      locked: data.locked,
      permanant: data.permanant,
      goToEditor: data.goToEditor,
      share: data.share,
      deleteNote: data.deleteNote,
      copyNote: data.copyNote,
      isBiometryAvailable: available,
      biometricUnlock: fingerprint,
      fingerprintAccess: data.fingerprintAccess,
      changePassword: data.changePassword,
    });
    if (fingerprint && this.state.novault && !this.state.fingerprintAccess) {
      await this._onPressFingerprintAuth();
    }
  };

  close = () => {
    if (this.state.loading) {
      ToastEvent.show(
        'Please wait and do not close the app.',
        'success',
        'local',
      );
      return;
    }
    updateEvent({type: Actions.NOTES});

    this.password = null;
    this.confirmPassword = null;
    this.setState({
      visible: false,
      note: {},
      locked: false,
      permanant: false,
      goToEditor: false,
      share: false,
      novault: false,
      deleteNote: false,
      passwordsDontMatch: false,
    });
  };

  onPress = async () => {
    if (this.state.loading) return;
    if (!this.password) {
      ToastEvent.show('You must fill all the fields.', 'error', 'local');
    }
    if (!this.state.novault) {
      if (this.password && this.password.length < 3) {
        ToastEvent.show('Password too short', 'error', 'local');

        return;
      }
      if (this.password !== this.confirmPassword) {
        ToastEvent.show('Passwords do not match', 'error', 'local');
        this.setState({
          passwordsDontMatch: true,
        });
        return;
      }

      this._createVault();
    } else if (this.state.changePassword) {
      if (!this.newPassword) {
        ToastEvent.show('You must fill all the fields.', 'error', 'local');
      }
      if (this.newPassword && this.newPassword.length < 3) {
        ToastEvent.show('New password too short', 'error', 'local');
        return;
      }
      this.setState({
        loading: true,
      });

      db.vault
        .changePassword(this.password, this.newPassword)
        .then((result) => {
          this.setState({
            loading: false,
          });
          if (this.state.biometricUnlock) {
            this._enrollFingerprint(this.newPassword);
          }
          ToastEvent.show('Vault password changed', 'success');
          this.close();
        })
        .catch((e) => {
          this.setState({
            loading: false,
          });
          if (e.message === db.vault.ERRORS.wrongPassword) {
            ToastEvent.show('Current password incorrect.', 'error', 'local');
          }
        });
    } else if (this.state.locked) {
      if (!this.password || this.password.trim() === 0) {
        ToastEvent.show('Password is invalid', 'error', 'local');
        this.setState({
          wrongPassword: true,
        });
        return;
      } else {
        db.vault
          .unlock(this.password)
          .then(async () => {
            this.setState({
              wrongPassword: false,
            });
            if (this.state.note.locked) {
              await this._unlockNote();
            } else {
              await this._lockNote();
            }
          })
          .catch((e) => {
            this._takeErrorAction(e);
          });
      }
    } else if (this.state.fingerprintEnroll) {
      this._enrollFingerprint(this.password);
    }
  };

  async _lockNote() {
    if (!this.password || this.password.trim() === 0) {
      ToastEvent.show('Password is invalid', 'error', 'local');
      return;
    } else {
      db.vault.add(this.state.note.id).then((e) => {
        this.close();
      });
    }
  }

  async _unlockNote() {
    if (!this.password || this.password.trim() === 0) {
      ToastEvent.show('Password is invalid', 'error', 'local');

      return;
    } else {
      if (this.state.permanant) {
        this._permanantUnlock();
      } else {
        await this._openNote();
      }
    }
  }

  async _openNote() {
    db.vault
      .open(this.state.note.id, this.password)
      .then(async (note) => {
        if (this.state.goToEditor) {
          console.log(note, 'NOTE');
          this._openInEditor(note);
        } else if (this.state.share) {
          this._shareNote(note);
        } else if (this.state.deleteNote) {
          await this._deleteNote();
        } else if (this.state.copyNote) {
          this._copyNote(note);
        }
      })
      .catch((e) => {
        this._takeErrorAction(e);
      });
  }
  async _deleteNote() {
    await db.notes.delete(this.state.note.id);
    updateEvent({type: Actions.NOTES});
    updateEvent({type: Actions.FAVORITES});
    eSendEvent(refreshNotesPage);
    this.close();
    ToastEvent.show('Note deleted', 'success', 'local');
  }

  async _enrollFingerprint(password) {
    try {
      await Keychain.setInternetCredentials('nn_vault', 'nn_vault', password, {
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        authenticationPrompt: {cancel: null},
        accessible: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
      });
    } catch (e) {
      this._takeErrorAction(e);
    }
  }

  async _createVault() {
    await db.vault.create(this.password);
    if (this.state.biometricUnlock) {
      await this._enrollFingerprint();
    }
    if (this.state.note && this.state.note.id && !this.state.note.locked) {
      await db.vault.add(this.state.note.id);
      this.close();
      ToastEvent.show('Note added to vault', 'success', 'local');
    } else {
      eSendEvent('vaultUpdated');
      this.close();
    }
  }

  _permanantUnlock() {
    db.vault
      .remove(this.state.note.id, this.password)
      .then((r) => {
        console.log(r, 'unocking result');
        this.close();
      })
      .catch((e) => {
        console.log(e, 'unlocking error');
        this._takeErrorAction(e);
      });
  }

  _openInEditor(note) {
    eSendEvent(eOnLoadNote, note);
    if (!DDS.isTab) {
      tabBarRef.current?.goToPage(1);
    }
    this.close();
  }


  _copyNote(note) {
    let text = toTXT(note.content.data);
    let m = `${note.title}\n \n ${text}`;
    Clipboard.setString(text);
    ToastEvent.show('Note copied to clipboard', 'success', 'local');
    this.close();
  }
 

  _shareNote(note) {
    let text = toTXT(note.content.data);
    let m = `${note.title}\n \n ${text}`;
    Share.open({
      title: 'Share note to',
      failOnCancel: false,
      message: m,
    });
    this.close();
  }

  _takeErrorAction(e) {
    if (e.message === db.vault.ERRORS.wrongPassword) {
      ToastEvent.show('Password is incorrect', 'error', 'local');
      this.setState({
        wrongPassword: true,
      });
      return;
    } else {
    }
  }

  _onPressFingerprintAuth = async () => {
    try {
      let credentials = await Keychain.getInternetCredentials('nn_vault', {
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        authenticationType:
          Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
        authenticationPrompt: {
          cancel: null,
        },
      });
      if (credentials?.password) {
        this.password = credentials.password;
        this.onPress();
      }
    } catch (e) {
      ToastEvent.show('Fingerprint Authentication Canceled', 'error', 'local');
    }
  };

  render() {
    const {colors} = this.props;
    const {
      note,
      visible,
      wrongPassword,
      passwordsDontMatch,
      novault,
      locked,
      permanant,
      biometricUnlock,
      deleteNote,
      share,
      goToEditor,
      fingerprintAccess,
      changePassword,
      copyNote,
      loading,
    } = this.state;

    if (!visible) return null;
    return (
      <BaseDialog
        onShow={() => {
          passInputRef.current?.focus();
        }}
        statusBarTranslucent={false}
        onRequestClose={this.close}
        visible={true}>
        <View
          style={{
            ...getElevation(5),
            width: DDS.isTab ? 350 : '80%',
            borderRadius: 5,
            backgroundColor: colors.bg,
            paddingHorizontal: ph,
            paddingVertical: pv,
          }}>
          <DialogHeader
            title={
              !novault
                ? 'Create Vault'
                : fingerprintAccess
                ? 'Fingerprint Access'
                : changePassword
                ? 'Change Vault Password'
                : note.locked
                ? deleteNote
                  ? 'Delete note'
                  : share
                  ? 'Share note'
                  : goToEditor
                  ? 'Unlock note'
                  : 'Unlock note'
                : 'Lock note'
            }
            paragraph={
              !novault
                ? 'Set a password to create vault'
                : fingerprintAccess
                ? 'Enter vault password to enable access to the vault with fingerprint'
                : changePassword
                ? 'Setup a new password for the vault.'
                : permanant
                ? 'Enter password to remove note from vault.'
                : note.locked
                ? deleteNote
                  ? 'Unlock note to delete it.'
                  : share
                  ? 'Unlock note to share it.'
                  : goToEditor
                  ? 'Unlock note to open it in editor'
                  : 'Enter vault password to unlock note.'
                : 'Enter vault password to lock note.'
            }
            icon="shield"
          />

          <Seperator />

          {novault || changePassword ? (
            <>
              <TextInput
                ref={passInputRef}
                editable={!loading}
                autoCapitalize="none"
                testID={notesnook.ids.dialogs.vault.pwd}
                style={{
                  padding: pv - 5,
                  borderBottomWidth: 1.5,
                  borderColor: wrongPassword
                    ? colors.errorText
                    : this.state.focusIndex === 0
                    ? colors.accent
                    : colors.nav,
                  paddingHorizontal: ph,
                  marginTop: 10,
                  fontSize: SIZE.sm,
                  fontFamily: WEIGHT.regular,
                }}
                onChangeText={(value) => {
                  this.password = value;
                }}
                onFocus={() => {
                  this.setState({
                    focusIndex: 0,
                  });
                }}
                secureTextEntry
                placeholder={changePassword ? 'Current Password' : 'Password'}
                placeholderTextColor={colors.icon}
              />

              <Seperator />
              {!this.state.biometricUnlock ||
              !novault ||
              changePassword ? null : (
                <Button
                  onPress={this._onPressFingerprintAuth}
                  width="100%"
                  title={
                    !note.locked
                      ? 'Lock with Fingerprint'
                      : 'Unlock with Fingerprint'
                  }
                  type="shade"
                />
              )}
            </>
          ) : null}

          {changePassword ? (
            <>
              <TextInput
                ref={changePassInputRef}
                editable={!loading}
                testID={notesnook.ids.dialogs.vault.changePwd}
                autoCapitalize="none"
                style={{
                  padding: pv - 5,
                  borderBottomWidth: 1.5,
                  borderColor: wrongPassword
                    ? colors.errorText
                    : this.state.focusIndex === 0
                    ? colors.accent
                    : colors.nav,
                  paddingHorizontal: ph,
                  marginTop: 10,
                  fontSize: SIZE.sm,
                  fontFamily: WEIGHT.regular,
                }}
                onChangeText={(value) => {
                  this.newPassword = value;
                }}
                onFocus={() => {
                  this.setState({
                    focusIndex: 0,
                  });
                }}
                secureTextEntry
                placeholder={'New Password'}
                placeholderTextColor={colors.icon}
              />
              <Seperator />
            </>
          ) : null}

          {!novault ? (
            <View>
              <TextInput
                ref={passInputRef}
                autoCapitalize="none"
                testID={notesnook.ids.dialogs.vault.pwd}
                style={{
                  padding: pv - 5,
                  borderBottomWidth: 1.5,
                  borderColor: passwordsDontMatch
                    ? colors.errorText
                    : this.state.focusIndex === 1
                    ? colors.accent
                    : colors.nav,
                  paddingHorizontal: ph,
                  fontSize: SIZE.sm,
                  fontFamily: WEIGHT.regular,
                }}
                onChangeText={(value) => {
                  this.password = value;
                }}
                onFocus={() => {
                  this.setState({
                    focusIndex: 1,
                  });
                }}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor={colors.icon}
              />

              <TextInput
                ref={confirmPassRef}
                autoCapitalize="none"
                testID={notesnook.ids.dialogs.vault.pwdAlt}
                style={{
                  padding: pv - 5,
                  borderBottomWidth: 1.5,
                  borderColor: passwordsDontMatch
                    ? colors.errorText
                    : this.state.focusIndex === 2
                    ? colors.accent
                    : colors.nav,
                  paddingHorizontal: ph,
                  fontSize: SIZE.sm,
                  fontFamily: WEIGHT.regular,
                  marginTop: 10,
                }}
                secureTextEntry
                onFocus={() => {
                  this.setState({
                    focusIndex: 2,
                  });
                }}
                onChangeText={(value) => {
                  this.confirmPassword = value;
                  if (value !== this.password) {
                    this.setState({
                      passwordsDontMatch: true,
                    });
                  } else {
                    this.setState({
                      passwordsDontMatch: false,
                    });
                  }
                }}
                placeholder="Confirm password"
                placeholderTextColor={colors.icon}
              />
            </View>
          ) : null}

          {this.state.isBiometryAvailable &&
          !this.state.fingerprintAccess &&
          ((!this.state.biometricUnlock && !changePassword) || !novault) ? (
            <TouchableOpacity
              onPress={() => {
                this.setState({
                  biometricUnlock: !biometricUnlock,
                });
              }}
              testID={notesnook.ids.dialogs.vault.fingerprint}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                width: '100%',
                alignItems: 'center',
                height: 40,
              }}>
              <Icon
                size={SIZE.lg}
                color={biometricUnlock ? colors.accent : colors.icon}
                name={
                  biometricUnlock
                    ? 'check-circle-outline'
                    : 'checkbox-blank-circle-outline'
                }
              />

              <Paragraph
                style={{
                  fontSize: SIZE.sm,
                  fontFamily: WEIGHT.regular,
                  color: colors.pri,
                  maxWidth: '90%',
                  marginLeft: 10,
                }}>
                Fingerprint Unlock
              </Paragraph>
            </TouchableOpacity>
          ) : null}

          <DialogButtons
            onPressNegative={this.close}
            onPressPositive={this.onPress}
            loading={loading}
            positiveTitle={
              fingerprintAccess
                ? 'Enable'
                : changePassword
                ? 'Change'
                : note.locked
                ? deleteNote
                  ? 'Delete'
                  : share
                  ? 'Share '
                  : goToEditor
                  ? 'Open'
                  : 'Unlock'
                : !note.id
                ? 'Create'
                : 'Lock'
            }
          />
        </View>
        <Toast context="local" />
      </BaseDialog>
    );
  }
}

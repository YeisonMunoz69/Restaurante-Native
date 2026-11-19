import React from 'react';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Renderer from 'react-test-renderer';
import { launchImageLibrary } from 'react-native-image-picker';
import { ThemeProvider } from '../../theme/ThemeContext';
import { Action } from '../attention/Controls';
import { ProfileAvatar, ProfileDetails, useLocalProfilePhoto } from './AccountProfile';

let mockOwner = 'primera-cuenta';
const googleUri = 'https://lh3.googleusercontent.com/avatar';
const expectedLocal = 'data:image/png;base64,cGhvdG8=';

jest.mock('react-native-image-picker', () => ({ launchImageLibrary: jest.fn() }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: mockOwner, correo: 'perfil@example.test', nombre: 'Ana Pérez', perfil: { fotoGoogleUrl: googleUri } },
  }),
}));

// Reabro el perfil para comprobar que la foto elegida sigue disponible solo para su cuenta.
function ProfileProbe() {
  const photo = useLocalProfilePhoto(mockOwner);
  return <>
    <ProfileAvatar googleUri={googleUri} localUri={photo.uri} />
    <ProfileDetails photo={photo} />
  </>;
}
const render = () => <ThemeProvider><ProfileProbe /></ThemeProvider>;

it('persiste la foto elegida por cuenta y vuelve a Google al quitarla', async () => {
  await AsyncStorage.clear();
  jest.mocked(launchImageLibrary).mockImplementation(async () => ({
    assets: [{ base64: 'cGhvdG8=', type: 'image/png' }],
  }));
  let tree!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => { tree = Renderer.create(render()); });
  const photoUris = () => tree.root.findAllByType(Image).map(image => image.props.source.uri);
  const action = (label: string) => tree.root.findAllByType(Action).find(node => node.props.label === label)!;

  expect(photoUris()).toEqual([googleUri, googleUri]);
  await Renderer.act(async () => action('settings.choosePhoto').props.onPress());
  expect(photoUris()).toEqual([expectedLocal, expectedLocal]);
  const [storageKey] = (await AsyncStorage.getAllKeys()).filter(key => key.includes('/primera-cuenta'));
  expect(await AsyncStorage.getItem(storageKey)).toBe(expectedLocal);

  Renderer.act(() => tree.unmount());
  await Renderer.act(async () => { tree = Renderer.create(render()); });
  expect(photoUris()).toEqual([expectedLocal, expectedLocal]);

  mockOwner = 'segunda-cuenta';
  await Renderer.act(async () => tree.update(render()));
  expect(photoUris()).toEqual([googleUri, googleUri]);
  mockOwner = 'primera-cuenta';
  await Renderer.act(async () => tree.update(render()));
  await Renderer.act(async () => action('settings.useGooglePhoto').props.onPress());
  expect(photoUris()).toEqual([googleUri, googleUri]);
  expect(await AsyncStorage.getItem(storageKey)).toBeNull();
  Renderer.act(() => tree.unmount());
});

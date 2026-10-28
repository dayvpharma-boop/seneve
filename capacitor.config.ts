import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'org.seneve.mobile',
  appName: 'SÉNEVÉ',
  webDir: 'dist-mobile',
  server: { androidScheme: 'https', appStartPath: '/habitudes/aujourdhui' },
  plugins: { LocalNotifications: { smallIcon: 'ic_stat_seneve', iconColor: '#38543e', presentationOptions: ['banner','sound','list'] } },
};
export default config;

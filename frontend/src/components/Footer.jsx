import { useSettings } from '../SettingsContext'

export default function Footer() {
  const { t } = useSettings()
  return <footer className="footer">{t('footerNote')}</footer>
}
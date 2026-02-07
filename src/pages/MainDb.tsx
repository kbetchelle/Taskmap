import { useAppStore } from '../stores/appStore'
import { ColumnsView } from '../components/ColumnsView'

export function MainDb() {
  const viewMode = 'main_db'
  const navigationPath = useAppStore((s) => s.navigationPath)
  const colorMode = useAppStore((s) => s.colorMode)

  return (
    <ColumnsView
      viewMode={viewMode}
      navigationPath={navigationPath}
      colorMode={colorMode}
    />
  )
}

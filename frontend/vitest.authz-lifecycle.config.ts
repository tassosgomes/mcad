import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@components': path.resolve(__dirname, './src/shared/components'),
      '@hooks': path.resolve(__dirname, './src/shared/hooks'),
      '@services': path.resolve(__dirname, './src/shared/services'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/features/authz/contract/authzPermissionLifecycleContract.test.ts',
      'src/features/authz/types/permission.test.ts',
      'src/features/authz/components/PermissionStatusBadge.test.tsx',
      'src/features/authz/api/authzPermissionLifecycleApi.test.ts',
      'src/features/authz/hooks/usePermissionLifecycle.test.tsx',
      'src/features/authz/pages/PermissionDetailPage.test.tsx',
      'src/features/authz/pages/PermissionsPage.test.tsx',
    ],
    coverage: {
      all: true,
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      include: [
        'src/features/authz/contract/authzPermissionLifecycleContract.ts',
        'src/features/authz/components/PermissionStatusBadge.tsx',
        'src/features/authz/api/authzPermissionLifecycleApi.ts',
        'src/features/authz/hooks/usePermissionLifecycle.ts',
      ],
    },
  },
});

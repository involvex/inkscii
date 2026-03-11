// @ts-check
import tseslint from 'typescript-eslint'
import solid from 'eslint-plugin-solid'

export default tseslint.config(
	// Global ignores
	{
		ignores: [
			'**/dist/**',
			'**/.wrangler/**',
			'**/node_modules/**',
			'**/*.d.ts',
			'packages/sdk/js/**',
			'.turbo/**',
		],
	},

	// TypeScript recommended for all TS/TSX files
	...tseslint.configs.recommended,

	// Common TypeScript rule overrides
	{
		files: ['**/*.{ts,tsx}'],
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{prefer: 'type-imports', fixStyle: 'inline-type-imports'},
			],
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/no-empty-object-type': [
				'error',
				{allowInterfaces: 'with-single-extends'},
			],
		},
	},

	// Legacy util package — allow TypeScript namespaces (KiloCode-inherited code)
	{
		files: ['packages/util/src/**/*.ts'],
		rules: {
			'@typescript-eslint/no-namespace': 'off',
		},
	},

	// SolidJS rules — web package only
	{
		files: ['packages/web/src/**/*.{ts,tsx}'],
		plugins: {solid},
		rules: {
			'solid/reactivity': 'warn',
			'solid/no-destructure': 'warn',
			'solid/jsx-no-duplicate-props': 'error',
			'solid/components-return-once': 'warn',
			'solid/no-unknown-namespaces': 'error',
		},
	},
)

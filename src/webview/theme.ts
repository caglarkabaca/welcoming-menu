import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      "html, body": {
        background: "var(--vscode-editor-background)",
        color: "var(--vscode-editor-foreground)",
        fontFamily: "var(--vscode-font-family)",
      },
    },
  },
  colors: {
    gray: {
      50: "var(--vscode-editor-background)",
      100: "var(--vscode-sideBar-background)",
      200: "var(--vscode-editorWidget-background)",
      300: "var(--vscode-editor-inactiveSelectionBackground)",
      400: "var(--vscode-descriptionForeground)",
      500: "var(--vscode-editor-foreground)",
      600: "var(--vscode-editorLineNumber-foreground)",
      700: "var(--vscode-editorLineNumber-activeForeground)",
      800: "var(--vscode-editor-selectionBackground)",
      900: "var(--vscode-editor-selectionHighlightBackground)",
    },
    teal: {
      500: "var(--vscode-button-background)",
      600: "var(--vscode-button-hoverBackground)",
    },
    red: {
      500: "var(--vscode-errorForeground)",
    },
  },
  components: {
    Modal: {
      baseStyle: {
        dialog: {
          bg: "var(--vscode-editor-background)",
          color: "var(--vscode-editor-foreground)",
        },
        header: {
          color: "var(--vscode-editor-foreground)",
        },
        closeButton: {
          color: "var(--vscode-editor-foreground)",
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: "var(--vscode-editorWidget-background)",
          borderColor: "var(--vscode-widget-border)",
        },
      },
    },
    Input: {
      baseStyle: {
        field: {
          bg: "var(--vscode-input-background)",
          color: "var(--vscode-input-foreground)",
          borderColor: "var(--vscode-input-border)",
          _hover: {
            borderColor: "var(--vscode-input-border)",
          },
          _focus: {
            borderColor: "var(--vscode-focusBorder)",
            boxShadow: "0 0 0 1px var(--vscode-focusBorder)",
          },
        },
      },
    },
    Button: {
      baseStyle: {
        _hover: {
          bg: "var(--vscode-button-hoverBackground)",
        },
      },
      variants: {
        solid: {
          bg: "var(--vscode-button-background)",
          color: "var(--vscode-button-foreground)",
        },
        outline: {
          borderColor: "var(--vscode-button-background)",
          color: "var(--vscode-button-background)",
          _hover: {
            bg: "var(--vscode-button-hoverBackground)",
            color: "var(--vscode-button-foreground)",
          },
        },
      },
    },
    Tabs: {
      baseStyle: {
        tab: {
          color: "var(--vscode-editor-foreground)",
          _selected: {
            color: "var(--vscode-button-background)",
            borderColor: "var(--vscode-button-background)",
          },
        },
        tablist: {
          borderColor: "var(--vscode-widget-border)",
        },
      },
    },
  },
});

export default theme; 
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { DesktopOnly } from "../../components/responsive";
import { HoverPopupHandler } from "./hover-popup";
import { SearchReplaceFloatingMenu } from "./search-replace";
export function EditorFloatingMenus(props) {
    return (_jsxs(_Fragment, { children: [_jsx(SearchReplaceFloatingMenu, Object.assign({}, props)), _jsx(DesktopOnly, { children: _jsx(HoverPopupHandler, Object.assign({}, props)) })] }));
}

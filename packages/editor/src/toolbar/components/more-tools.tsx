/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2022 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { useRef, useState } from "react";
import { PopupWrapper } from "../../components/popup-presenter";
import { ToolButton } from "../components/tool-button";
import { useToolbarLocation } from "../stores/toolbar-store";
import { ToolProps } from "../types";
import { getToolbarElement } from "../utils/dom";
import { ToolId } from "../tools";
import { ToolbarGroup } from "./toolbar-group";

type MoreToolsProps = ToolProps & {
  popupId: string;
  tools: ToolId[];
  autoCloseOnUnmount?: boolean;
};
export function MoreTools(props: MoreToolsProps) {
  const { popupId, editor, tools, autoCloseOnUnmount } = props;
  const toolbarLocation = useToolbarLocation();
  const isBottom = toolbarLocation === "bottom";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ToolButton
        {...props}
        toggled={isOpen}
        buttonRef={buttonRef}
        onClick={() => setIsOpen((s) => !s)}
      />
      <PopupWrapper
        isOpen={isOpen}
        group={"toolbarGroup"}
        id={popupId}
        onClosed={() => setIsOpen(false)}
        position={{
          isTargetAbsolute: true,
          target: isBottom ? getToolbarElement() : buttonRef.current || "mouse",
          align: "center",
          location: isBottom ? "top" : "below",
          yOffset: 10
        }}
        autoCloseOnUnmount={autoCloseOnUnmount}
        focusOnRender={false}
        blocking={false}
        renderPopup={() => (
          <ToolbarGroup
            tools={tools}
            editor={editor}
            sx={{
              flex: 1,
              // this is intentionally set to a fixed value
              // because we want the same padding on mobile
              // and web.
              p: "5px",
              boxShadow: "menu",
              bg: "background",
              borderRadius: "default",
              overflowX: "auto",
              maxWidth: "95vw"
            }}
          />
        )}
      />
    </>
  );
}

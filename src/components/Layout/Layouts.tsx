import React from "react";
import NavBar from "../NavBar/NavBar";

interface LayoutProps {
  leftSidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  leftSidebar,
  rightSidebar,
  children,
}) => {
  return (
    <>
      <NavBar />

      <div className="flex flex-row w-[100vw]">
        {/* Left Sidebar */}
        <aside className="w-[15vw] p-4 bg-gray-100">
          {leftSidebar || <p>Left Sidebar Content</p>}
        </aside>

        {/* Main Content */}
        <main className="w-[70vw] p-4">{children}</main>

        {/* Right Sidebar */}
        <aside className="w-[15vw] p-4 bg-gray-100">
          {rightSidebar || <p>Right Sidebar Content</p>}
        </aside>
      </div>
    </>
  );
};

export default Layout;

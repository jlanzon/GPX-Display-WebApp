function NavBar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <a href="/GPX-Display-WebApp/" className="flex">
          <span className="text-xl font-semibold whitespace-nowrap">
            Mission Support center GPX Map Player
          </span>
        </a>
        <div className="flex md:order-2"></div>
        <div className="w-full md:flex md:w-auto md:order-1">
          <ul className="flex flex-col mt-4 md:flex-row md:space-x-8 md:mt-0">
            <li>
              <a
                href="/GPX-Display-WebApp/"
                className="block py-2 pr-4 pl-3 text-gray-700 rounded hover:bg-gray-100 md:hover:bg-transparent"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="/GPX-Display-WebApp/gpx"
                className="block py-2 pr-4 pl-3 text-gray-700 rounded hover:bg-gray-100 md:hover:bg-transparent"
              >
                GPX Player
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;

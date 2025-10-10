import { Link } from "react-router-dom";
import logo from "../assets/cat.jpg";

export default function Header() {
  return (
    <header className="bg-gray-800 text-white shadow-md h-[8vh] flex items-center">
         <div className="h-full aspect-square flex flex-wrap justify-left items-center bg-green-900">
            <div className= "flex items-center">
              <Link className="mx-auto aspect-square flex items-center justify-center p-0 rounded-full hover:bg-gray-900 overflow-hidden" to="/"> 
               <img src={logo} className="h-full w-full object-cover rounded-full" />
              </Link>

              <h1> SUPER COOL </h1>
            </div>
         </div>
    </header>
  );
};

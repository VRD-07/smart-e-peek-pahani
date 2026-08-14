export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "w-full py-3.5 px-4 rounded-xl font-semibold text-center transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2";

  const variants = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/30",
    secondary: "bg-primary-50 hover:bg-primary-100 text-primary-700",
    outline: "border-2 border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

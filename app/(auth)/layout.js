import React from "react";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-[#fffbff] selection:bg-[#ffae88] selection:text-[#6a2700] overflow-hidden">
      {/* Background elements */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.15]" 
        style={{
          backgroundImage: `url(https://lh3.googleusercontent.com/aida/ADBb0ugl7r1oOHE4zCR_sKi8RK7Mtdx3ISHK1IZ0MBtT-kJGasZy58BqnL1thgxavaUGY-Qae83LCT7T8K6xu2K2LHofpluC3UyJmRAWpbllLI4KDowKGokcsm5-8mKkzug7L5oOJ3Mu2pZpii4vbrR3533r8g2ISHhzRoNUtduDkDyQ1WppEShT3X4ezOA9kZXltWFh5zCfl6ZOVbRGDF1toBY5l65ZuHp7_55gQriYMJumYHHHZ33pnHUsl5SbLLmlLBmYpp2IHJqe)`,
          backgroundSize: '600px',
          mixBlendMode: 'multiply'
        }}
      />
      <div className="absolute inset-0 z-0 opacity-60" style={{ background: 'radial-gradient(circle at top right, rgba(255, 174, 136, 0.2), transparent 60%), radial-gradient(circle at bottom left, rgba(255, 217, 226, 0.25), transparent 60%)' }} />
      
      {/* Floating orbs for depth */}
      <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-[#ffae88]/10 blur-[100px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[35rem] h-[35rem] bg-[#ffd9e2]/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full flex flex-col items-center gap-8 py-12 px-4">
        {/* Logo or Brand name */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl font-bold text-[#ab4400] tracking-tighter">Riceee</div>
          <div className="text-stone-400 text-xs font-bold uppercase tracking-[0.3em]">Our Digital Sanctuary</div>
        </div>
        
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;


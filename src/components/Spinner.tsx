import React from "react";

const Spinner = (props: any) => (
  <div className={`${props.className || ""} preloader-spin`}>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
    <div className="preloader-spin__petal"></div>
  </div>
);

export default Spinner;

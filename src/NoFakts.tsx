import { useFakts } from "fakts";
import { Form, Formik } from "formik";
import React from "react";

export interface PublicHomeProps {}

export interface ConfigValues {
  host: string;
}

export const NoFakts: React.FC<PublicHomeProps> = (props) => {
  const { load } = useFakts();

  return (
    <div className="flex flex-col">
      <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
        <Formik<ConfigValues>
          initialValues={{
            host: `${window.location.hostname}:8000`,
          }}
          onSubmit={({ host }, { setSubmitting }) => {
            setSubmitting(true);
            load({
              name: "Localhost",
              base_url: `http://${host}/f/`,
            });
          }}
        >
          {(formikProps) => (
            <Form>
              <div className="flex flex-row">
                <div className="text-left overflow-hidden ">
                  <input name="host" />
                </div>
                <div className="ml-2">
                  <button
                    type="submit"
                    className=" shadow-lg shadow-primary-700/90 flex items-center  border border-transparent text-base font-medium rounded-md text-white bg-primary-300 hover:bg-primary-500"
                  >
                    {" "}
                    Use
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

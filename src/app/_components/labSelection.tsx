import React from 'react'

const LabSelection = ({setLab}: {setLab: React.Dispatch<React.SetStateAction<null | "physics" | "biology">>}) => {

    return (
        <div className="flex flex-col h-screen justify-center items-center">
            <h1 className="text-3xl pb-7 font-bold">Select a Lab</h1>
            <div className="flex pb-5 gap-10">
                <div className="w-76 h-48 rounded-lg bg-blue-500 cursor-pointer hover:scale-105 hover-blue flex text-center justify-center items-center relative" onClick={() => setLab("physics")}>
                    <h1 className="text-2xl mt-2 font-semibold">🧪Physics/Chemistry</h1>
                </div>
                <div className="w-76 h-48 rounded-lg bg-green-500 cursor-pointer hover:scale-105 hover-green flex text-center justify-center items-center relative" onClick={() => setLab("biology")}>
                    <h1 className="text-2xl mt-2 font-semibold">🔬Biology</h1>
                </div>
            </div>
        </div>
    )
}

export default LabSelection
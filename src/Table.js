import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useTable } from "react-table";

const inferSeverity = (alert) => {
  const description = alert.description?.toLowerCase() || "";
  const ttp = alert.ttp?.toLowerCase() || "";

  if (description.includes("unauthorized_access") || ttp.includes("unauthorized_access")) {
    return "High";
  }
  if (description.includes("malicious") || ttp.includes("dos")) {
    return "Medium";
  }
  if (description.includes("normal")) {
    return "Normal";
  }

  return "Critical"; // default fallback
};

const Table = () => {
  const [data, setData] = useState([]);

  const fetchData = useCallback(() => {
    axios
      .get("http://192.168.126.87:5000/api/incidents")
      .then((response) => {
        const sortedData = response.data
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 30)
          .map((alert) => ({
            ...alert,
            severity: inferSeverity(alert),
          }));
        setData(sortedData);
      })
      .catch((error) => {
        console.error("Error fetching data: ", error);
      });
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000); // Refresh every 10 seconds
    return () => clearInterval(interval); // Clean up on unmount
  }, [fetchData]);

  const columns = React.useMemo(
    () => [
      {
        Header: "Incident ID",
        accessor: "id",
      },
      {
        Header: "Timestamp",
        accessor: "timestamp",
      },
      {
        Header: "Description",
        accessor: "description",
      },
      {
        Header: "TTP",
        accessor: "ttp",
        Cell: ({ row }) => {
          const handleStixClick = () => {
            const incidentId = row.original.id;

            axios
              .get(`http://192.168.126.87:5000/api/stixalerts/${incidentId}`)
              .then((response) => {
                const stixData = response.data;
                const newTab = window.open();
                newTab.document.write("<pre>" + JSON.stringify(stixData, null, 2) + "</pre>");
                newTab.document.close();
              })
              .catch((error) => {
                console.error("Error fetching STIX alert:", error);
                alert("No TTP available");
              });
          };

          return <button onClick={handleStixClick}>TTP</button>;
        },
      },
      {
        Header: "Severity",
        accessor: "severity",
        Cell: ({ value }) => (
          <span
            style={{
              color: value === "High" ? "red" : value === "Medium" ? "orange" : "green",
              fontWeight: "bold",
            }}
          >
            {value}
          </span>
        ),
      },
      {
        Header: "XAI",
        accessor: "xai",
        Cell: ({ row }) => {
          const handleXaiClick = () => {
            try {
              const frame = JSON.parse(row.original.rawData);
              const formData = new FormData();
              formData.append("model_name", "ai4fids_model_v1");
              formData.append("data", JSON.stringify(frame));

              axios
                .post("http://192.168.126.91:8080/api/analysis/web/ai4cyber", formData, {
                  headers: {
                    "content-type": "multipart/form-data",
                  },
                })
                .then((response) => {
                  window.open(response.data, "_blank");
                })
                .catch((error) => {
                  console.error("Erreur XAI:", error);
                  alert("Impossible de contacter le module XAI.");
                });
            } catch (err) {
              console.error("Erreur JSON :", err);
              alert("Format de données invalide");
            }
          };

          return <button onClick={handleXaiClick}>XAI</button>;
        },
      },
      {
        Header: "Raw Data",
        accessor: "rawData",
        Cell: ({ value }) => (
          <button onClick={() => openRawDataInNewTab(value)}>View JSON</button>
        ),
      },
    ],
    []
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable({
    columns,
    data,
  });

  const openRawDataInNewTab = (rawData) => {
    const newTab = window.open();
    newTab.document.write("<pre>" + JSON.stringify(JSON.parse(rawData), null, 2) + "</pre>");
    newTab.document.close();
  };

  return (
    <div className="table-container">
      <table {...getTableProps()} className="table">
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>{column.render("Header")}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return <td {...cell.getCellProps()}>{cell.render("Cell")}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Table;

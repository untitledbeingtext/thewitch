import csv
import json
import os


def convert_csv_to_json(
    filename,
    card_id="",
    card_name="",
    anchor_col=15,
    anchor_row=15,
    keywords=None,
    upright="",
    reversed_meaning="",
):
  if not filename.endswith(".csv"):
    csv_filename = f"{filename}.csv"
  else:
    csv_filename = filename

  base_name = os.path.splitext(csv_filename)[0]

  input_path = os.path.join("csv", csv_filename)
  output_folder = "data"
  os.makedirs(
      output_folder, exist_ok=True
  )

  if not card_id:
    clean_name = base_name.split("-")[-1].strip()
    card_id = clean_name.lower().replace(" ", "_")

  output_path = os.path.join(output_folder, f"{card_id}.json")

  pattern_rows = []
  with open(input_path, "r", encoding="utf-8") as file:
    data = csv.reader(file)
    for row in data:
      line = "".join(cell.strip() if cell.strip() != "" else "." for cell in row)
      if line:
        pattern_rows.append(line)

  card_data = {
      "id": card_id,
      "name": card_name if card_name else base_name,
      "anchorCol": anchor_col,
      "anchorRow": anchor_row,
      "keywords": keywords if keywords is not None else [],
      "meaning": {"upright": upright, "reversed": reversed_meaning},
      "pattern": pattern_rows,
  }

  with open(output_path, "w", encoding="utf-8") as json_file:
    json.dump(card_data, json_file, ensure_ascii=False, indent=2)

  print('done')

convert_csv_to_json("THE WITCH - THE MAGICIAN.csv")
convert_csv_to_json(
    filename="THE WITCH - THE HIGH PRIETESS",
    card_id="the_high_priestess",
    card_name="II. The High Priestess",
    keywords=[],
    upright="",
    reversed_meaning="",
)
convert_csv_to_json("THE WITCH - BACK.csv")
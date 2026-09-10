from app.models.block import create_block


def parse_content(content: str) -> list[dict]:
    blocks = []

    lines = content.splitlines()
    order = 1

    for line in lines:
        line = line.strip()

        if not line:
            continue

        if line.startswith("## "):
            block_type = "subheading"
            text = line[3:]

        elif line.startswith("# "):
            block_type = "heading"
            text = line[2:]

        elif line.startswith("- "):
            block_type = "list_item"
            text = line[2:]

        elif line.startswith("* "):
            block_type = "list_item"
            text = line[2:]

        else:
            block_type = "paragraph"
            text = line

        block = create_block(
            block_type=block_type,
            order=order,
            content=text,
        )

        blocks.append(block)
        order += 1

    return blocks
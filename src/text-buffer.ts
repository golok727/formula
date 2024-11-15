interface Piece {
	add: boolean;
	start: number;
	length: number;
}

export class PieceTable {
	private originalBuffer = "";
	private addBuffer = "";

	private pieces: Piece[];

	constructor(text = "") {
		this.originalBuffer = text;
		this.pieces = [
			{
				add: false,
				start: 0,
				length: text.length,
			},
		];
	}

	apply() {
		const str = this.getText();
		return new PieceTable(str);
	}

	private getPeiceAndBufferOffset(posInBuffer: number) {
		if (posInBuffer < 0) throw new RangeError("Position cannot be negative.");

		let remainingLength = posInBuffer;

		for (let i = 0; i < this.pieces.length; i++) {
			const piece = this.pieces[i];
			if (remainingLength <= piece.length) {
				return { piece, index: i, bufferOffset: piece.start + remainingLength };
			}
			remainingLength -= piece.length;
		}

		throw new RangeError("position provided exceedes text length");
	}

	insert(pos: number, text: string) {
		const addBufferOffset = this.addBuffer.length;

		this.addBuffer += text;

		const {
			piece,
			index: peiceIndex,
			bufferOffset,
		} = this.getPeiceAndBufferOffset(pos);

		if (
			piece.add &&
			piece.start + piece.length === bufferOffset &&
			piece.start + piece.length === addBufferOffset
		) {
			piece.length += text.length;
			return;
		}

		const toInsert: Piece[] = [
			{
				add: piece.add,
				start: piece.start,
				length: bufferOffset - piece.start,
			},
			{
				add: true,
				start: addBufferOffset,
				length: text.length,
			},
			{
				add: piece.add,
				start: bufferOffset,
				length: piece.length - (bufferOffset - piece.start),
			},
		].filter((p) => p.length > 0);

		this.pieces.splice(peiceIndex, 1, ...toInsert);
	}

	delete(start: number, length: number): void {
		if (length === 0) {
			return;
		}
		if (length < 0) {
			this.delete(start + length, -length);
			return;
		}
		if (start < 0) {
			throw new RangeError("start cannot be negative");
		}

		// First, find the affected pieces, since a delete can span multiple pieces
		const {
			piece: startPeiceToDelete,
			index: startPieceIndexToDelete,
			bufferOffset: startPieceBufferOffsetToDelete,
		} = this.getPeiceAndBufferOffset(start);

		const {
			piece: endPeiceToDelete,
			index: endPeiceIndexToDelete,
			bufferOffset: endPeiceBufferOffsetToDelete,
		} = this.getPeiceAndBufferOffset(start + length);

		// If the deletion happens in start and end of the same peice then adjust the windpw
		if (startPieceIndexToDelete === endPeiceIndexToDelete) {
			const piece = startPeiceToDelete;
			// deleting at the start of the peice?
			if (startPieceBufferOffsetToDelete === piece.start) {
				piece.start += length;
				piece.length -= length;

				if (piece.length === 0) this.pieces.splice(startPieceIndexToDelete, 1);

				return;
			}
			// deleting at the end of the peice?
			if (endPeiceBufferOffsetToDelete === piece.start + piece.length) {
				piece.length -= length;

				if (piece.length === 0)
					this.pieces.splice(endPeiceBufferOffsetToDelete, 1);
				return;
			}
		}

		const deletePieces: Piece[] = [
			{
				add: startPeiceToDelete.add,
				start: startPeiceToDelete.start,
				length: startPieceBufferOffsetToDelete - startPeiceToDelete.start,
			},
			{
				add: endPeiceToDelete.add,
				start: endPeiceBufferOffsetToDelete,
				length:
					endPeiceToDelete.length -
					(endPeiceBufferOffsetToDelete - endPeiceToDelete.start),
			},
		].filter((piece) => piece.length > 0);

		this.pieces.splice(
			startPieceIndexToDelete,
			endPeiceIndexToDelete - startPieceIndexToDelete + 1,
			...deletePieces,
		);
	}

	getText() {
		let str = "";
		for (const peice of this.pieces) {
			const buffer = peice.add ? this.addBuffer : this.originalBuffer;
			str += buffer.substring(peice.start, peice.start + peice.length);
		}
		return str;
	}

	length() {
		let length = 0;
		for (let i = 0; i < this.pieces.length; i++)
			length += this.pieces[i].length;
		return length;
	}

	empty() {
		return this.pieces.length === 0;
	}
}
